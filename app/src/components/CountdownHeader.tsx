import React, { useState } from 'react';
import classNames from 'classnames';
import Timer from 'react-compound-timer';
import './CountdownHeader.scss';

const launchDay = new Date('October 12, 2020 00:00:00');

function CountdownHeader() {
  const [dead, setDead] = useState(false);
  return (
    <header className={classNames('countdownHeader', { dead })}
            onClick={(e) => setDead(true)}>
      <div className="countdownLogo"/>
      <p>
        <Timer
          initialTime={launchDay.getTime() - (new Date()).getTime()}
          direction="backward"
          formatValue={(s) => s.toString().padStart(2, '0')}
        >
          {() => (
            <>
              <Timer.Days />:<Timer.Hours />:<Timer.Minutes />:<Timer.Seconds />
            </>
)}
        </Timer>
      </p>
    </header>
  );

}

export default CountdownHeader;
