import Wizard from './components/wizard/Wizard.tsx';
import './App.css';

function App() {
  const version = `Built ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(+process.env.BUILD_TIME!)}`;
  return <Wizard version={version} />;
}

export default App;
