import React from 'react';
import Timer from 'react-compound-timer';
import './CountdownHeader.scss';

interface CountdownProps {
  date: Date;
  killPig: () => void;
}

function CountdownHeader(props : CountdownProps) {
  const { date, killPig } = props;
  return (
    <header className="countdownHeader"
            onClick={(e) => killPig()}>
      <div className="countdownLogo"/>
      <p>
        <Timer
          initialTime={date.getTime() - (new Date()).getTime()}
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
