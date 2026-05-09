import { Link } from 'react-router-dom';

interface Review {
  id: number;
  name: string;
  avatar: string;
  rating: number;
  text: string;
}

const reviews: Review[] = [
  {
    id: 1,
    name: 'Anna Kowalska',
    avatar: 'https://i.pravatar.cc/80?img=1',
    rating: 5,
    text: 'Najlepsze burgery w mieście! Świeże składniki, idealnie wysmażone mięso. Na pewno wrócę.',
  },
  {
    id: 2,
    name: 'Marcin Nowak',
    avatar: 'https://i.pravatar.cc/80?img=3',
    rating: 4,
    text: 'Pizza na cienkim cieście palce lizać. Szybka dostawa i miła obsługa. Polecam!',
  },
  {
    id: 3,
    name: 'Katarzyna Wiśniewska',
    avatar: 'https://i.pravatar.cc/80?img=5',
    rating: 5,
    text: 'Desery są obłędne! Tiramisu i sernik nowojorski to must try. Idealne miejsce na spotkanie ze znajomymi.',
  },
];

function Stars({ count }: { count: number }) {
  return (
    <span className="text-warning">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i}>{i < count ? '\u2605' : '\u2606'}</span>
      ))}
    </span>
  );
}

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section
        className="d-flex align-items-center justify-content-center text-white text-center"
        style={{
          background:
            'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80) center/cover no-repeat',
          minHeight: '80vh',
        }}
      >
        <div className="container">
          <h1 className="display-3 fw-bold mb-3">Restauracja Smak</h1>
          <p className="lead fs-4 mb-4">
            Burgery, pizza, zupy i desery — wszystko ze świeżych, lokalnych
            składników.
          </p>
          <Link to="/menu" className="btn btn-success btn-lg px-5">
            Zobacz menu
          </Link>
        </div>
      </section>

      {/* O nas */}
      <section className="py-5 bg-white">
        <div className="container text-center">
          <h2 className="mb-4">O nas</h2>
          <p
            className="lead mx-auto"
            style={{ maxWidth: '700px' }}
          >
            Jesteśmy rodzinną restauracją z pasją do dobrego jedzenia.
            Specjalizujemy się w burgerach, pizzy, zupach i deserach —
            wszystko przygotowujemy na miejscu z najwyższej jakości składników.
          </p>
          <div className="row mt-4 justify-content-center">
            <div className="col-md-4 mb-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h5 className="card-title">📍 Adres</h5>
                  <p className="card-text text-muted mb-0">
                    ul. Restauracyjna 12
                    <br />
                    00-001 Warszawa
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h5 className="card-title">🕐 Godziny otwarcia</h5>
                  <p className="card-text text-muted mb-0">
                    Pon–Pt: 11:00–22:00
                    <br />
                    Sob–Nd: 12:00–23:00
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h5 className="card-title">📞 Kontakt</h5>
                  <p className="card-text text-muted mb-0">
                    +48 123 456 789
                    <br />
                    kontakt@restauracjasmak.pl
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Opinie */}
      <section className="py-5 bg-light">
        <div className="container">
          <h2 className="text-center mb-5">Co mówią nasi goście</h2>
          <div className="row g-4">
            {reviews.map((r) => (
              <div key={r.id} className="col-md-4">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body text-center">
                    <img
                      src={r.avatar}
                      alt={r.name}
                      className="rounded-circle mb-3"
                      width="80"
                      height="80"
                    />
                    <h5 className="card-title">{r.name}</h5>
                    <div className="mb-2">
                      <Stars count={r.rating} />
                    </div>
                    <p className="card-text text-muted">"{r.text}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stopka */}
      <footer className="bg-dark text-white py-4">
        <div className="container">
          <div className="row">
            <div className="col-md-4 mb-3">
              <h6 className="fw-bold">Restauracja Smak</h6>
              <p className="small text-secondary mb-0">
                ul. Restauracyjna 12
                <br />
                00-001 Warszawa
              </p>
            </div>
            <div className="col-md-4 mb-3">
              <h6 className="fw-bold">Godziny otwarcia</h6>
              <p className="small text-secondary mb-0">
                Pon–Pt: 11:00–22:00
                <br />
                Sob–Nd: 12:00–23:00
              </p>
            </div>
            <div className="col-md-4 mb-3">
              <h6 className="fw-bold">Kontakt</h6>
              <p className="small text-secondary mb-0">
                Tel: +48 123 456 789
                <br />
                Email: kontakt@restauracjasmak.pl
              </p>
            </div>
          </div>
          <hr className="border-secondary" />
          <p className="text-center text-secondary small mb-0">
            &copy; {new Date().getFullYear()} Restauracja Smak. Wszelkie prawa
            zastrzeżone.
          </p>
        </div>
      </footer>
    </>
  );
}
