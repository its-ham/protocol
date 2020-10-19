import React, { useRef, useState } from 'react';
import classNames from 'classnames';
import useEventListener from '@use-it/event-listener';

import iYamWhatIYam from '../images/i-yam-what-i-yam.png';
import lock from '../images/lock.png';
import "./Farms.scss";

interface FarmProps {
  imageSrc: string;
  title?: string;
  subtitle?: string;
  description?: any;
  onClosePressed?: (e : any) => void;
  children?: any[];
  dark?: boolean;
}

function ZoomedFarm(props : FarmProps) {
  const { imageSrc, title, subtitle, children } = props;
  const containerRef = useRef(null);

  const onContainerPressed = (event : any) => {
    if (event.target === containerRef.current &&
        props.onClosePressed !== undefined) {
      props.onClosePressed(event);
    }
  };

  useEventListener("keyup", (e : any) => {
    if (e.key === "Escape" && props.onClosePressed !== undefined) {
      props.onClosePressed(e);
    }
  });

  return <div ref={containerRef}
    className={classNames({zoomedFarm: true, dark: !!props.dark})}
    onClick={props.onClosePressed === undefined ? undefined : onContainerPressed}>
    <div className="zoomedFarmModal">
      <a className="close" onClick={props.onClosePressed || undefined}>X</a>
      <img src={imageSrc} alt="farm" />
      { (title || subtitle) &&
        <div className="sidebar">
          { title && <h2>{props.title}</h2> }
          { subtitle && <h3>{props.subtitle}</h3> }
          { children }
        </div>
      }
    </div>
  </div>;
}

function Farm(props : FarmProps) {
  const { imageSrc } = props;
  const [zoomed, setZoomed] = useState(false);
  return <>
    <img src={imageSrc} onClick={() => setZoomed(true)} className="farm" alt="farm"/>
    {zoomed && <ZoomedFarm onClosePressed={(e) => setZoomed(false)} {...props} />}
  </>;
}

function LockedFarm() {
  return <Farm imageSrc={lock} />;
}

interface FarmsProps {
  degeneracy: number;
}

function Farms(props : FarmsProps) {
  return <section className="">
    <header>
      <h1>Farm</h1>
      <p>Tend the hogs, eat HAM</p>
    </header>
    <div className="farms">
      <Farm title="I Yam What I Yam" imageSrc={iYamWhatIYam}>
        <p>
          Stake and burn YAM, earn HAM. After 20M YAM, the hogs will be full, regardless of rebases.
        </p>
        <p>
          Sorry, the hogs only eat Yam Classic.
        </p>
        <button>Feed the hogs</button>
      </Farm>
      <LockedFarm />
      <LockedFarm />
      <LockedFarm />
      <LockedFarm />
      <LockedFarm />
      <LockedFarm />
      <LockedFarm />
      <LockedFarm />
      <LockedFarm />
      <LockedFarm />
      <LockedFarm />
      <LockedFarm />
      <LockedFarm />
      <LockedFarm />
      <LockedFarm />
      <LockedFarm />
    </div>
  </section>;
}

export default Farms;
