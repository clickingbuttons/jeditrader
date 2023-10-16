import { useState } from 'preact/hooks';
import { getCookie, setCookie } from './cookies.js';
import { Provider, Clickhouse, Polygon } from '@jeditrader/providers';

export interface ProviderSelectProps {
	setProvider(p: Provider): void;
}

export function ProviderSelect({ setProvider }: ProviderSelectProps) {
	const apiKey = getCookie('POLY_API_KEY') ?? '';
	const providers = {
		'clickhouse': {
			url: 'http://localhost:8123',
			valid: useState(true),
		},
		'polygon': {
			apiKey,
			valid: useState(apiKey.length > 0),
		},
	};
	const [providerName, setProviderName] = useState(Object.keys(providers)[0] as keyof typeof providers);
	return (
		<form onSubmit={ev => {
			ev.preventDefault();
			if (providerName === 'polygon') setProvider(new Polygon(providers.polygon.apiKey));
			if (providerName === 'clickhouse') setProvider(new Clickhouse(providers.clickhouse.url));
		}}>
			<table>
				<tr>
					<td><label>Provider</label></td>
					<td>
						<select
							value={providerName}
							onChange={(ev: any) => setProviderName(ev.target.value)}
						>
								{(Object.keys(providers) as (keyof typeof providers)[]).map(p =>
									<option value={p}>{p}</option>
								)}
						</select>
					</td>
				</tr>
				{providerName === 'polygon' &&
					<tr>
						<td><label>API key</label></td>
						<td>
							<input
								value={providers.polygon.apiKey}
								onChange={(ev: any) => {
									providers.polygon.apiKey = ev.target.value;
									providers.polygon.valid[1](providers.polygon.apiKey.length > 0);
									setCookie('POLY_API_KEY', ev.target.value);
								}}
							/>
						</td>
					</tr>
				}
				{providerName === 'clickhouse' &&
					<tr>
						<td><label>URL</label></td>
						<td>
							<input
								value={providers.clickhouse.url}
								onChange={(ev: any) => {
									providers.clickhouse.url = ev.target.value;
									providers.clickhouse.valid[1](providers.clickhouse.url.length > 0);
								}}
							/>
						</td>
					</tr>
				}
			</table>
			<input type="submit" disabled={!providers[providerName].valid[0]} />
		</form>
	);
}

