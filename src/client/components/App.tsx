import * as React from 'react';
//export interface AppProps { compiler: string; framework: string; }

import { Header } from './Header.jsx';
import { View } from './View.jsx';
import { Footer } from './Footer.jsx';

export class App extends React.Component {
  render() {
    return (
      <div className='appContainer' >
        <Header />
        <View />
        <Footer />
      </div>
    );
  }
}