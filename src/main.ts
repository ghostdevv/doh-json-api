// @deno-types="npm:@types/dns-packet"
import packet, { type RecordType } from 'npm:dns-packet';
import * as recordType from './types.ts';
// @deno-types="npm:@types/node"
import { Buffer } from 'node:buffer';

interface ShapedData {
	Status: number;
	TC: boolean;
	RD: boolean;
	RA: boolean;
	AD: boolean;
	CD: boolean;
	Question: Array<{
		name: string;
		type: number;
	}>;
	Answer: Array<{
		name: string;
		type: number;
		TTL: number;
		data: string;
	}>;
}

const RESOLVERS = Object.freeze({
	'lookup.zone': 'https://dja.lookup.zone/dns-query',
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

	if (typeof name != 'string') {
		return new Response('missing name param', { status: 400 });
	}

	const resolver = url.searchParams.get('resolver') || 'lookup.zone';

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
		Status: 0, // todo
		TC: data.flag_tc,
		RD: data.flag_rd,
		RA: data.flag_ra,
		AD: data.flag_ad,
		CD: data.flag_cd,
		Question: (data.questions || [])?.map((q) => ({
			name: q.name,
			type: recordType.fromStr(q.type),
		})),
		Answer: (data.answers || [])?.map((a) => ({
			name: a.name,
			type: recordType.fromStr(a.type),
			TTL: (a as any)?.ttl,
			data: (a as any)?.data,
		})),
	} satisfies ShapedData);
});
