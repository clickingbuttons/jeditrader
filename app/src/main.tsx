import { render } from 'preact';
import { Chart } from './chart.js';
import { preferDark } from './helpers.js';
import './main.css';

if (preferDark()) document.body.classList.replace('light', 'dark');

const root = document.getElementById('root');
if (root) {
	render(<Chart />, root)
} else {
	console.log('no root container');
}

