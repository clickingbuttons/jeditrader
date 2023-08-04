import { setCookie } from './cookies.js';
import { useState } from 'preact/hooks';
import { Polygon } from '@jeditrader/providers';
import { toymd } from './helpers.js';

export async function isValidAPIKey(apiKey?: string): Promise<Boolean> {
	if (typeof apiKey !== 'string' || apiKey.length === 0) return false;
	const client = new Polygon(apiKey);
	return client.year('AAPL', '2020-01-01', toymd(new Date()))
		.then(() => true)
		.catch(() => false);
}

export function Signin(
	{ path, apiKey, setAPIKey }
: {
	path: string;
	apiKey: string;
	setAPIKey: (v: string) => void;
}) {
	const [error, setError] = useState('');

	return (
		<form onSubmit={ev => {
			ev.preventDefault();
			isValidAPIKey(apiKey).then(res => {
				if (res) {
					setError('');
					setCookie('POLY_API_KEY', apiKey);
				} else {
					setError('invalid api key');
				}
			});
		}}>
			<label for="apiKey">Polygon API key</label>
			<input
				type="text"
				value={apiKey}
				onChange={ev => setAPIKey((ev.target as HTMLInputElement).value)}
			/>
			<input type="submit" value="Submit" />
			<br />
			<br />
			<div>This is the only cookie saved on this site. Lasts 1 year.</div>
			<div>{error}</div>
		</form>
	);
}

