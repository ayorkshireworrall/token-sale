import './App.css';
import Content from './containers/Content/Content';
import Header from './containers/Header/Header';

function App() {
  return (
    <div className="App">
      <div className="App-header">
        <Header />
      </div>
      <div className="App-content">
        <Content />
      </div>
    </div>
  );
}

export default App;
