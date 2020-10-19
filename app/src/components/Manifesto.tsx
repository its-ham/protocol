import React, { Component } from 'react';
import { NavLink } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

import ham from '../images/ham.svg';
import "./Manifesto.scss";

type State = {
  markdown: string | null
}

export default class Manifesto extends Component<{}, State> {
  constructor(props : any) {
    super(props);

    this.state = {
      markdown: null,
    };
  }

  componentDidMount() {
    fetch('/public/MANIFESTO.md')
      .then(response => response.text())
      .then(text => this.setState({ markdown: text }));
  }

  render() {
    const { markdown } = this.state;
    if(markdown === null) {
      return <p>Writing...</p>;
    }
    return <>
      <ReactMarkdown>
        { this.state.markdown }
      </ReactMarkdown>
      <NavLink to="/farming">
        <img className="hambone" src={ham} alt="hambone"/>
      </NavLink>
    </>;
  }
}
