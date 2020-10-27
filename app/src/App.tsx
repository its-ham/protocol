import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  NavLink
} from 'react-router-dom';
import Color from 'color';
import useEventListener from '@use-it/event-listener';

import CountdownHeader from './components/CountdownHeader';
import Farms from './components/Farms';
import pig from './images/pig.svg';
import deadPig from './images/pig-dead.svg';
import './App.scss';

const launchDay = new Date('October 30, 2020 00:00:00');
const prod = process.env.NODE_ENV === "production";

function WalletArea() {
  return <button>Connect Wallet</button>;
}

function Logo() {
  const [hovering, setHover] = useState(false);
  return <NavLink to="/" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
    <img className="logo" src={hovering ? deadPig : pig} alt="logo" />
  </NavLink>;
}

function Nav() {
  if (launchDay.getTime() > Date.now() && prod) {
    return <nav />;
  }
  return <nav>
    <Logo />
    <ul>
      <li>
        <NavLink to="/farming">Farming</NavLink>
      </li>
      <li>
        <NavLink to="/about">About</NavLink>
      </li>
    </ul>
    <WalletArea />
  </nav>;
}

function Home() {
  if (launchDay.getTime() > Date.now() && prod) {
    return <CountdownHeader /> ;
  }
  return <div>Let's do this</div>;
}

function App() {
  const [degen, setDegen] = useState(0);

  useEventListener("scroll", (e) => {
    const maxScroll = Math.max(document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight );
    setDegen(window.scrollY / maxScroll);
  });

  const bg = Color('#fff7d6').mix(Color('#300c48'), degen * 1.4);

  return (
    <Router>
      <main className="App" style={{ backgroundColor: bg.hex() }}>
        <header>
          <Nav />
        </header>
        <Switch>
          <Route path="/farming">
            <Farms degeneracy={degen}/>
          </Route>
          <Route path="/">
            <Home />
          </Route>
        </Switch>
      </main>
    </Router>
  );
}

export default App;
