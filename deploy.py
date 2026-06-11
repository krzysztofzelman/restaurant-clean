#!/usr/bin/env python3
"""
Automated VPS Deployment Script for Restaurant App
Run this AFTER pushing changes to GitHub:
  1. git add -A && git commit -m "production setup" && git push
  2. python deploy.py

Connects via SSH (password), sets up Docker, builds & deploys everything.
"""

import os
import paramiko
import time
import getpass
import secrets
import string


def _req_env(key: str, prompt: str) -> str:
    """Read from env or prompt interactively."""
    val = os.environ.get(key)
    if val:
        return val
    return getpass.getpass(prompt).strip()


VPS_HOST = _req_env("VPS_HOST", "VPS host/IP: ")
VPS_USER = os.environ.get("VPS_USER", "root")
VPS_PORT = int(os.environ.get("VPS_PORT", "2022"))
VPS_PASS = _req_env("VPS_PASS", f"SSH password for {VPS_USER}@{VPS_HOST}: ")

REPO_URL = "https://github.com/krzysztofzelman/restaurant-clean.git"
PROJECT_DIR = "/root/restaurant-clean"
DOMAIN = os.environ.get("DOMAIN", VPS_HOST)


class SSHClient:
    def __init__(self):
        self.client = paramiko.SSHClient()
        self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    def connect(self):
        print(f"Connecting to {VPS_USER}@{VPS_HOST}:{VPS_PORT} ...")
        self.client.connect(
            VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASS,
            look_for_keys=False, allow_agent=False, timeout=30,
        )
        print("Connected!")

    def run(self, command, sudo=False, check=True, timeout=120):
        if sudo:
            command = f"sudo {command}"
        stdin, stdout, stderr = self.client.exec_command(command, timeout=timeout)
        exit_code = stdout.channel.recv_exit_status()
        out = stdout.read().decode("utf-8", errors="replace").strip()
        err = stderr.read().decode("utf-8", errors="replace").strip()
        if check and exit_code != 0:
            print(f"  WARN: exit {exit_code}: {command[:80]}...")
            if err:
                print(f"  stderr: {err[:300]}")
        return out, err, exit_code

    def run_ok(self, command, sudo=False):
        _, _, ec = self.run(command, sudo=sudo, check=False)
        return ec == 0

    def upload_str(self, remote_path, content):
        sftp = self.client.open_sftp()
        with sftp.open(remote_path, "w") as f:
            f.write(content)
        sftp.close()

    def close(self):
        self.client.close()


def step(msg):
    print(f"\n{'='*60}\n  {msg}\n{'='*60}")


def main():
    ssh = SSHClient()
    ssh.connect()

    # 1. System update + Docker + Nginx
    step("1. System update & install Docker + Nginx")

    out, _, _ = ssh.run("cat /etc/os-release | head -1", check=False)
    print(f"  OS: {out}")

    if not ssh.run_ok("docker --version"):
        print("  Installing Docker...")
        ssh.run("apt-get update -qq", timeout=120)
        ssh.run("apt-get install -y -qq docker.io docker-compose-v2", timeout=120)
        ssh.run("systemctl enable --now docker")
    else:
        out, _, _ = ssh.run("docker --version")
        print(f"  Docker: {out}")

    if not ssh.run_ok("nginx -v"):
        print("  Installing Nginx + Certbot...")
        ssh.run("apt-get install -y -qq nginx certbot python3-certbot-nginx", timeout=120)
    else:
        out, _, _ = ssh.run("nginx -v 2>&1", check=False)
        print(f"  Nginx: {out}")

    # 2. Clone / pull repo
    step("2. Clone/pull repository")
    if not ssh.run_ok(f"test -d {PROJECT_DIR}"):
        ssh.run(f"git clone {REPO_URL} {PROJECT_DIR}")
        print("  Repo cloned")
    else:
        ssh.run(f"cd {PROJECT_DIR} && git pull")
        print("  Repo pulled")

    # 3. Create production .env
    step("3. Create production .env")

    auto_secret = os.environ.get(
        "DEPLOY_SECRET_KEY",
        "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(48)),
    )
    auto_stripe_secret = os.environ.get("STRIPE_SECRET_KEY", "sk_live_placeholder")
    auto_stripe_webhook = os.environ.get("STRIPE_WEBHOOK_SECRET", "whsec_placeholder")
    auto_deepseek = os.environ.get("DEEPSEEK_API_KEY", "")
    auto_stripe_pub = os.environ.get("VITE_STRIPE_PUBLISHABLE_KEY", "pk_live_xxxxxxxxxxxxxxx")

    env_content = f"""DATABASE_URL=postgresql://restaurant:restaurant_prod@postgres:5432/restaurant
REDIS_URL=redis://redis:6379/0
SECRET_KEY={auto_secret}
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
STRIPE_SECRET_KEY={auto_stripe_secret}
STRIPE_WEBHOOK_SECRET={auto_stripe_webhook}
DEEPSEEK_API_KEY={auto_deepseek}
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
VITE_API_URL=https://{DOMAIN}
VITE_STRIPE_PUBLISHABLE_KEY={auto_stripe_pub}
FRONTEND_URL=https://{DOMAIN}
"""
    ssh.upload_str(f"{PROJECT_DIR}/.env", env_content)
    print("  .env created with production values")

    # 4. Update PostgreSQL password in docker-compose for production
    step("4. Update PostgreSQL password in docker-compose")
    ssh.run(
        f"cd {PROJECT_DIR} && "
        f'sed -i "s/POSTGRES_PASSWORD: restaurant_dev/POSTGRES_PASSWORD: restaurant_prod/" docker-compose.yml'
    )
    print("  DB password updated")

    # 5. Docker Compose up
    step("5. Docker Compose up")
    print("  Pulling images...")
    ssh.run(f"cd {PROJECT_DIR} && docker compose pull", timeout=180)
    print("  Building and starting containers...")
    out, err, code = ssh.run(f"cd {PROJECT_DIR} && docker compose up -d --build", timeout=300)
    if err:
        for line in err.split("\n")[-10:]:
            print(f"  {line}")
    print("  Containers starting...")

    # 6. Wait for health
    step("6. Wait for backend health")
    healthy = False
    for i in range(30):
        out, _, _ = ssh.run("curl -s http://localhost:8000/api/health", check=False)
        if "ok" in out:
            print(f"  Backend healthy after {i+1}s")
            healthy = True
            break
        time.sleep(2)
    if not healthy:
        print("  Backend health check timed out — checking logs...")
        ssh.run("docker compose logs --tail=30 backend", timeout=30)

    # 7. Build frontend
    step("7. Build frontend")
    if not ssh.run_ok("node --version"):
        print("  Installing Node.js...")
        ssh.run("apt-get install -y -qq nodejs npm", timeout=120)
    out, _, code = ssh.run(f"cd {PROJECT_DIR} && npm install", timeout=120)
    if code != 0:
        print(f"  npm install failed, trying with --legacy-peer-deps")
        out, _, code = ssh.run(f"cd {PROJECT_DIR} && npm install --legacy-peer-deps", timeout=120)
    out, _, code = ssh.run(f"cd {PROJECT_DIR} && npm run build", timeout=120)
    for line in out.split("\n")[-10:]:
        print(f"  {line}")
    if code == 0:
        print("  Frontend build OK")
    else:
        print("  Frontend build FAILED — continuing anyway")

    # 8. Nginx config
    step("8. Configure Nginx")
    nginx_conf = f"""server {{
    listen 80;
    server_name _;

    # Backend API
    location /api/ {{
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
    }}

    # Uploaded images
    location /images/ {{
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }}

    # Frontend static files
    location / {{
        root /var/www/restaurant/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }}
}}
"""
    ssh.upload_str("/etc/nginx/sites-available/restaurant", nginx_conf)
    ssh.run("rm -f /etc/nginx/sites-enabled/default")
    ssh.run("ln -sf /etc/nginx/sites-available/restaurant /etc/nginx/sites-enabled/restaurant")

    # Copy dist
    ssh.run(f"rm -rf /var/www/restaurant/dist")
    ssh.run(f"cp -r {PROJECT_DIR}/dist /var/www/restaurant/dist")

    # Reload Nginx
    out, err, code = ssh.run("nginx -t", check=False)
    if code == 0:
        ssh.run("systemctl reload nginx || nginx -s reload")
        print("  Nginx reloaded")
    else:
        print(f"  Nginx config error: {err[:300]}")

    # 9. UFW
    step("9. Firewall")
    if ssh.run_ok("which ufw"):
        ssh.run("ufw --force enable", check=False)
        ssh.run("ufw allow 80/tcp", check=False)
        ssh.run("ufw allow 443/tcp", check=False)
        ssh.run(f"ufw allow {VPS_PORT}/tcp", check=False)
        print("  UFW ports opened (80, 443, 2022)")

    # 10. Final test
    step("10. Final verification")
    time.sleep(3)
    for endpoint in ["/api/health", "/"]:
        out, _, _ = ssh.run(
            f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost{endpoint}", check=False
        )
        print(f"  http://localhost{endpoint} -> HTTP {out}")

    out, _, _ = ssh.run(f"curl -s -o /dev/null -w '%{{http_code}}' http://{DOMAIN}/api/health", check=False)
    print(f"  http://{DOMAIN}/api/health -> HTTP {out}")

    out, _, _ = ssh.run("docker compose ps --format '{{.Name}}\t{{.Status}}'")
    print(f"\n  Containers:\n{out}")

    print(f"\n{'='*60}")
    print(f"  DEPLOYMENT COMPLETE!")
    print(f"  App: http://{DOMAIN}")
    print(f"  API: http://{DOMAIN}/api/health")
    print(f"{'='*60}")

    ssh.close()


if __name__ == "__main__":
    main()
