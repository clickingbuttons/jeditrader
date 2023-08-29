import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { isValidAPIKey, Signin } from './signin.js';
import { Chart } from './chart.js';
import { getCookie } from './cookies.js';
import { Router, route } from 'preact-router';
import { preferDark } from './helpers.js';
import './main.css';

if (preferDark()) document.body.classList.replace('light', 'dark');

function Main() {
	const [apiKey, setAPIKey] = useState(getCookie('POLY_API_KEY') || '');

	// useEffect(() => {
	// 	isValidAPIKey(apiKey).then(isValid => route(isValid ? '/chart' : '/signin'));
	// }, [apiKey]);

	return (
		<Router>
			<div path="/">Checking API key</div>
			{/*<Signin path="/signin" apiKey={apiKey} setAPIKey={setAPIKey} />*/}
			<Chart path="/chart" apiKey={apiKey} />
		</Router>
	);
}

const root = document.getElementById('root');
if (root) {
	render(<Main />, root)
} else {
	console.log('no root container');
}

