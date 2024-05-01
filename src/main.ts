import * as recordType from './types.ts';
// @deno-types="npm:@types/node"
import { Buffer } from 'node:buffer';
// @deno-types="npm:@types/dns-packet"
import packet from 'npm:dns-packet';

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

Deno.serve(async (request) => {
	const url = new URL(request.url);

	const name = url.searchParams.get('name');
	if (!name) return new Response('missing name param', { status: 400 });

	const type = url.searchParams.get('type') || 'A';
	if (!type) return new Response('missing type param', { status: 400 });

	const response = await fetch('https://wsys.lookup.zone/dns-query', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/dns-message',
		},
		body: packet.encode({
			type: 'query',
			id: Math.floor(Math.random() * 65534) + 1,
			flags: packet.RECURSION_DESIRED,
			questions: [
				{
					type: type as any,
					name,
				},
			],
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
			TTL: (a as any).ttl,
			data: (a as any).data,
		})),
	} satisfies ShapedData);
});
