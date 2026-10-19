/* === App entry ======================================================= */
function App() {
  return (
    <React.Fragment>
      <window.LockCursor />
      <window.Nav />
      <main>
        <window.Hero />
        <window.Tape />
        <window.Hangar />
        <window.Numbers />
        <window.Papers />
        <window.Logbook />
        <window.About />
        <window.Contact />
      </main>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
