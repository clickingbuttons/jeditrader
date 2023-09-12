import { render } from 'preact';
import { Chart } from './chart.js';
import './main.css';

const root = document.getElementById('root');
if (root) render(<Chart />, root);
else console.error('no root container');

