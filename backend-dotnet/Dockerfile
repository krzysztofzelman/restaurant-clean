# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution and project files for layer caching
COPY Restaurant.slnx .
COPY src/Restaurant.Domain/Restaurant.Domain.csproj src/Restaurant.Domain/
COPY src/Restaurant.Application/Restaurant.Application.csproj src/Restaurant.Application/
COPY src/Restaurant.Infrastructure/Restaurant.Infrastructure.csproj src/Restaurant.Infrastructure/
COPY src/Restaurant.WebAPI/Restaurant.WebAPI.csproj src/Restaurant.WebAPI/

# Restore dependencies
RUN dotnet restore

# Copy full source
COPY . .

# Build and publish
RUN dotnet publish src/Restaurant.WebAPI/Restaurant.WebAPI.csproj -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
EXPOSE 8000

# Copy published output
COPY --from=build /app/publish .

# Default environment (overridable by docker-compose)
ENV ASPNETCORE_URLS=http://+:8000
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "Restaurant.WebAPI.dll"]
