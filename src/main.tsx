import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { isValidAPIKey, Signin } from './signin';
import { Chart } from './chart';
import { getCookie } from './cookies';
import { Router, route } from 'preact-router';
import { preferDark } from './helpers';
import './main.css';

if (preferDark()) document.body.classList.replace('light', 'dark');

function Main() {
	const [apiKey, setAPIKey] = useState(getCookie('POLY_API_KEY') || '');

	useEffect(() => {
		isValidAPIKey(apiKey).then(isValid => route(isValid ? '/chart' : '/signin'));
	}, [apiKey]);

	return (
		<Router>
			<div path="/">Checking API key</div>
			<Signin path="/signin" apiKey={apiKey} setAPIKey={setAPIKey} />
			<Chart path="/chart" apiKey={apiKey} />
		</Router>
	);
}

render(<Main />, document.getElementById('root'));

