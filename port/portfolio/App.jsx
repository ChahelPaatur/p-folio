/* === Portfolio UI Kit · App entry =================================== */
const { useEffect: ueA } = React;

function useReveal() {
  ueA(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function App() {
  useReveal();
  return (
    <React.Fragment>
      <window.Nav />
      <window.Hero />
      <window.Marquee />
      <window.Work />
      <window.HireMe />
      <window.Research />
      <window.Patents />
      <window.Education />
      <window.Certifications />
      <window.Leadership />
      <window.About />
      <window.Contact />
      <window.Footer />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
