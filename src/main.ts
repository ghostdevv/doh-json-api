// @deno-types="npm:@types/dns-packet"
import packet, { type RecordType } from 'npm:dns-packet';
// @deno-types="npm:@types/node"
import { Buffer } from 'node:buffer';

const RESOLVERS = Object.freeze({
	cloudflare: 'https://1.1.1.1/dns-query',
	google: 'https://dns.google/dns-query',
});

function isSupportedRecordType(type: any): type is RecordType {
	return ['A', 'AAAA', 'CNAME'].includes(type?.toUpperCase());
}

function isValidResolver(thing: any): thing is keyof typeof RESOLVERS {
	return Object.keys(RESOLVERS).includes(thing);
}

Deno.serve(async (request) => {
	const url = new URL(request.url);

	const name = url.searchParams.get('name');

	if (!name || name?.trim().length == 0) {
		return new Response('invalid/missing name param', { status: 400 });
	}

	const resolver = url.searchParams.get('resolver') || 'cloudflare';

	if (!isValidResolver(resolver)) {
		return new Response('invalid resolver', { status: 400 });
	}

	const type = url.searchParams.get('type') || 'A';

	if (!isSupportedRecordType(type)) {
		return new Response('type must be A, AAAA, or CNAME', { status: 400 });
	}

	const response = await fetch(RESOLVERS[resolver], {
		method: 'POST',
		headers: {
			'Content-Type': 'application/dns-message',
		},
		body: packet.encode({
			type: 'query',
			id: Math.floor(Math.random() * 65534) + 1,
			flags: packet.RECURSION_DESIRED,
			questions: [{ type, name }],
		}),
	});

	const data = packet.decode(Buffer.from(await response.arrayBuffer()));

	return Response.json({
		status: 'rcode' in data ? data.rcode : null,
		flags: {
			tc: data.flag_tc,
			rd: data.flag_rd,
			ra: data.flag_ra,
			ad: data.flag_ad,
			cd: data.flag_cd,
		},
		questions: data.questions || null,
		answers: data.answers || null,
		authorities: data.authorities || null,
		additionals: data.additionals || null,
	});
});
