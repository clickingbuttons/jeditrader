import { render } from 'preact';
import { Chart } from './chart.js';
import { dark } from './util.js';
import './main.css';

const root = document.getElementById('root');
if (root) render(<Chart />, root);
else console.error('no root container');

dark.subscribe(d => {
	if (d) document.body.classList.replace('light', 'dark');
	else document.body.classList.replace('dark', 'light');
});

