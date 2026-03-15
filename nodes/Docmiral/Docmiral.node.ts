import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IBinaryKeyData,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

// ─── helpers ────────────────────────────────────────────────────────────────

async function docmiralRequest(
	ctx: IExecuteFunctions,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	const credentials = await ctx.getCredentials('docmiralApi');
	const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

	const hasBody = body !== undefined && Object.keys(body).length > 0;

	return ctx.helpers.httpRequestWithAuthentication.call(ctx, 'docmiralApi', {
		method,
		url: `${baseUrl}${path}`,
		headers: { 'Content-Type': 'application/json' },
		qs,
		body: hasBody ? body : undefined,
		json: true,
	}) as Promise<IDataObject>;
}

async function downloadBinary(ctx: IExecuteFunctions, url: string): Promise<Buffer> {
	return Buffer.from(
		await ctx.helpers.httpRequest({ method: 'GET', url, encoding: 'arraybuffer' }) as ArrayBuffer,
	);
}


async function buildDocumentBody(ctx: IExecuteFunctions, i: number, prefix: string): Promise<IDataObject> {
	const templateId = ctx.getNodeParameter(`${prefix}TemplateId`, i) as string;
	const name = ctx.getNodeParameter(`${prefix}Name`, i, '') as string;
	const init = ctx.getNodeParameter(`${prefix}Init`, i, false) as boolean;
	const body: IDataObject = { templateId, init };
	if (name) body.name = name;
	if (!init) {
		const dataJson = ctx.getNodeParameter(`${prefix}DataJson`, i, '{}') as string;
		const settingsJson = ctx.getNodeParameter(`${prefix}SettingsJson`, i, '{}') as string;
		const data = typeof dataJson === 'string' ? JSON.parse(dataJson) : dataJson;
		const settings = typeof settingsJson === 'string' ? JSON.parse(settingsJson) : settingsJson;
		const hasData = Object.keys(data as object).length > 0;
		const hasSettings = Object.keys(settings as object).length > 0;
		if (hasData || hasSettings) {
			body.data = {
				...(hasSettings ? { settings } : {}),
				...(data as object),
			};
		}
	}
	return body;
}

// ─── node definition ─────────────────────────────────────────────────────────

export class Docmiral implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DocMiral',
		name: 'docmiral',
		icon: 'file:docmiral.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Interact with the DocMiral document generation platform',
		defaults: { name: 'DocMiral' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'docmiralApi', required: true }],
		properties: [
			// ── resource ──────────────────────────────────────────────────────
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Document', value: 'document' },
					{ name: 'Template', value: 'template' },
					// { name: 'TARS (AI)', value: 'tars' },
					{ name: 'Category', value: 'category' },
				],
				default: 'document',
			},

			// ── document operations ───────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['document'] } },
				options: [
					{ name: 'Build Image', value: 'buildImage', action: 'Build image from a document' },
					{ name: 'Build PDF', value: 'buildPdf', action: 'Build PDF from a document' },
					{ name: 'Build PPTX', value: 'buildPptx', action: 'Build power point from a document' },
					{ name: 'Clone', value: 'clone', action: 'Clone a document' },
					{ name: 'Create', value: 'create', action: 'Create a document' },
					{ name: 'Delete', value: 'delete', action: 'Delete a document' },
					{ name: 'Get', value: 'get', action: 'Get a document' },
					{ name: 'List', value: 'list', action: 'List documents' },
					{ name: 'Update', value: 'update', action: 'Update a document' },
				],
				default: 'list',
			},

			// ── template operations ───────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['template'] } },
				options: [
					{ name: 'Build Image', value: 'buildImage', action: 'Build image from a template' },
					{ name: 'Build PDF', value: 'buildPdf', action: 'Build PDF from a template' },
					{ name: 'Clone', value: 'clone', action: 'Clone a template' },
					{ name: 'Create', value: 'create', action: 'Create a template' },
					{ name: 'Delete', value: 'delete', action: 'Delete a template' },
					{ name: 'Get', value: 'get', action: 'Get a template' },
					{ name: 'Get Schema', value: 'getSchema', action: 'Get template schema' },
					{ name: 'List', value: 'list', action: 'List templates' },
					{ name: 'Update', value: 'update', action: 'Update a template' },
				],
				default: 'list',
			},

			// ── tars operations ───────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['tars'] } },
				options: [
					{ name: 'Chat (Fill Document)', value: 'chat', action: 'Use AI to fill a document' },
					{ name: 'Parse CV', value: 'parseCV', action: 'Parse a CV PDF into structured data' },
					{ name: 'Extract Text', value: 'extractText', action: 'Extract text from a file' },
					{ name: 'Smart Clone', value: 'smartClone', action: 'Ai powered smart clone of a document' },
				],
				default: 'chat',
			},

			// ── category operations ──────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['category'] } },
				options: [
					{ name: 'List', value: 'list', action: 'List categories' },
				],
				default: 'list',
			},


			// ══════════════════════════════════════════════════════════════════
			// DOCUMENT fields
			// ══════════════════════════════════════════════════════════════════

			// list
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				displayOptions: { show: { resource: ['document'], operation: ['list'] } },
				description: 'Max number of results to return',
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				default: 0,
				displayOptions: { show: { resource: ['document'], operation: ['list'] } },
			},

			// get / update / delete / build / clone — document ID
			{
				displayName: 'Document ID',
				name: 'entityId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['get', 'update', 'delete', 'clone'],
					},
				},
			},

			// create — template ID
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['document'], operation: ['create'] } },
				description: 'ID of the template to create this document from',
			},

			// create — name
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['document'], operation: ['create'] } },
				description: 'Optional name for the new document',
			},

			// create — init
			{
				displayName: 'Init (Empty Document)',
				name: 'init',
				type: 'boolean',
				default: false,
				displayOptions: { show: { resource: ['document'], operation: ['create'] } },
				description: 'Whether to create an empty document without any data',
			},

			// create — settings (hidden when init=true)
			{
				displayName: 'Settings (JSON)',
				name: 'settingsJson',
				type: 'json',
				default: '{}',
				displayOptions: { show: { resource: ['document'], operation: ['create'], init: [false] } },
				description: 'Document settings: size, background, color, margin, padding, fontSize',
			},

			// create — data (hidden when init=true)
			{
				displayName: 'Data (JSON)',
				name: 'dataJson',
				type: 'json',
				default: '{}',
				displayOptions: { show: { resource: ['document'], operation: ['create'], init: [false] } },
				description: 'Document field data as JSON object',
			},

			// update — data (JSON)
			{
				displayName: 'Data (JSON)',
				name: 'dataJson',
				type: 'json',
				default: '{}',
				displayOptions: { show: { resource: ['document'], operation: ['update'] } },
				description: 'Document field data as JSON object',
			},

			// build image — page
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				displayOptions: { show: { resource: ['document'], operation: ['buildImage'] } },
				description: 'Page number to render (1-based)',
			},

			// build pdf/pptx/image — source toggle
			{
				displayName: 'Build Source',
				name: 'buildSource',
				type: 'options',
				options: [
					{ name: 'By Document ID', value: 'byId' },
					{ name: 'Directly From Template', value: 'direct' },
				],
				default: 'byId',
				displayOptions: { show: { resource: ['document'], operation: ['buildPdf', 'buildPptx', 'buildImage'] } },
				description: 'Build from an existing document or create one on-the-fly from a template',
			},

			// build — document ID (byId mode)
			{
				displayName: 'Document ID',
				name: 'buildEntityId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['document'], operation: ['buildPdf', 'buildPptx', 'buildImage'], buildSource: ['byId'] } },
			},

			// build — template ID (direct mode)
			{
				displayName: 'Template ID',
				name: 'buildTemplateId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['document'], operation: ['buildPdf', 'buildPptx', 'buildImage'], buildSource: ['direct'] } },
				description: 'ID of the template to create the document from',
			},

			// build — name (direct mode)
			{
				displayName: 'Name',
				name: 'buildName',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['document'], operation: ['buildPdf', 'buildPptx', 'buildImage'], buildSource: ['direct'] } },
				description: 'Optional name for the created document',
			},

			// build — init (direct mode)
			{
				displayName: 'Init (Empty Document)',
				name: 'buildInit',
				type: 'boolean',
				default: false,
				displayOptions: { show: { resource: ['document'], operation: ['buildPdf', 'buildPptx', 'buildImage'], buildSource: ['direct'] } },
				description: 'Whether to create an empty document without any data',
			},

			// build — settings (direct mode, init=false)
			{
				displayName: 'Settings (JSON)',
				name: 'buildSettingsJson',
				type: 'json',
				default: '{}',
				displayOptions: { show: { resource: ['document'], operation: ['buildPdf', 'buildPptx', 'buildImage'], buildSource: ['direct'], buildInit: [false] } },
				description: 'Document settings: size, background, color, margin, padding, fontSize',
			},

			// build — data (direct mode, init=false)
			{
				displayName: 'Data (JSON)',
				name: 'buildDataJson',
				type: 'json',
				default: '{}',
				displayOptions: { show: { resource: ['document'], operation: ['buildPdf', 'buildPptx', 'buildImage'], buildSource: ['direct'], buildInit: [false] } },
				description: 'Document field data as JSON object',
			},

			// build — keep document (direct mode)
			{
				displayName: 'Keep Document',
				name: 'keepDocument',
				type: 'boolean',
				default: true,
				displayOptions: { show: { resource: ['document'], operation: ['buildPdf', 'buildPptx', 'buildImage'], buildSource: ['direct'] } },
				description: 'Whether to keep the created document in your list after building. Disable to auto-delete it after the file is generated.',
			},

			// ══════════════════════════════════════════════════════════════════
			// TEMPLATE fields
			// ══════════════════════════════════════════════════════════════════

			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				description: 'Max number of results to return',
				default: 50,
				displayOptions: { show: { resource: ['template'], operation: ['list'] } },
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				default: 0,
				displayOptions: { show: { resource: ['template'], operation: ['list'] } },
			},
			{
				displayName: 'Category ID',
				name: 'templateListCategoryId',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['template'], operation: ['list'] } },
				description: 'Filter templates by category ID',
			},
			{
				displayName: 'Library',
				name: 'templateLibrary',
				type: 'options',
				options: [
					{ name: 'Public Library', value: 'public' },
					{ name: 'My Library', value: 'mylist' },
				],
				default: 'public',
				displayOptions: { show: { resource: ['template'], operation: ['list'] } },
				description: 'Filter templates from the public library or only your own',
			},
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['template'], operation: ['get', 'update', 'delete', 'clone', 'buildPdf', 'buildImage', 'getSchema'] } },
			},

			// create fields
			{
				displayName: 'Name',
				name: 'templateName',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['template'], operation: ['create'] } },
				description: 'Template name. Use "suggest" to auto-generate a name.',
			},
			{
				displayName: 'Category ID',
				name: 'categoryId',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['template'], operation: ['create'] } },
			},
			{
				displayName: 'HTML',
				name: 'templateHtml',
				type: 'string',
				typeOptions: { rows: 6 },
				default: '',
				displayOptions: { show: { resource: ['template'], operation: ['create'] } },
				description: 'Initial HTML content for the template',
			},
			{
				displayName: 'Settings (JSON)',
				name: 'templateSettings',
				type: 'json',
				default: '{}',
				displayOptions: { show: { resource: ['template'], operation: ['create'] } },
				description: 'Template settings: size, margin, padding, background, color, fontSize, fonts',
			},

			// update fields
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['template'], operation: ['update'] } },
				options: [
					{
						displayName: 'Footer Content',
						name: 'footer_content',
						type: 'string',
						typeOptions: { rows: 4 },
						default: '',
					},
					{
						displayName: 'Header Content',
						name: 'header_content',
						type: 'string',
						typeOptions: { rows: 4 },
						default: '',
					},
					{
						displayName: 'HTML',
						name: 'html',
						type: 'string',
						typeOptions: { rows: 6 },
						default: '',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Settings (JSON)',
						name: 'settings',
						type: 'json',
						default: '{}',
						description: 'Template settings: size, margin, padding, background, color, fontSize, fonts',
					},
				],
			},

			// getSchema fields
			{
				displayName: 'Schema Format',
				name: 'schemaFormat',
				type: 'options',
				options: [
					{ name: 'Standard', value: 'standard' },
					{ name: 'JSON Schema', value: 'jsonSchema' },
					{ name: 'OpenAI (AI Model)', value: 'aimodel_openai' },
				],
				default: 'standard',
				displayOptions: { show: { resource: ['template'], operation: ['getSchema'] } },
			},
			{
				displayName: 'Output',
				name: 'schemaOutput',
				type: 'options',
				options: [
					{ name: 'Schema Definition', value: 'schema' },
					{ name: 'Sample Data', value: 'sample' },
				],
				default: 'schema',
				displayOptions: { show: { resource: ['template'], operation: ['getSchema'] } },
			},
			{
				displayName: 'Include Default Values',
				name: 'defaultValue',
				type: 'boolean',
				default: false,
				displayOptions: { show: { resource: ['template'], operation: ['getSchema'], schemaOutput: ['sample'] } },
				description: 'Whether to include default/sample values in the output',
			},

			// ══════════════════════════════════════════════════════════════════
			// TARS fields
			// ══════════════════════════════════════════════════════════════════

			// chat
			{
				displayName: 'Document ID',
				name: 'entityId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['tars'], operation: ['chat', 'smartClone'] } },
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				required: true,
				displayOptions: { show: { resource: ['tars'], operation: ['chat', 'smartClone'] } },
				description: 'Natural language instruction for TARS (e.g. "Name is Alice, she works at Google")',
			},

			// parseCV / extractText
			{
				displayName: 'Binary Property',
				name: 'binaryProperty',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: { resource: ['tars'], operation: ['parseCV', 'extractText'] },
				},
				description: 'Name of the binary property containing the file to process',
			},

			// smartClone
			{
				displayName: 'Target Category',
				name: 'category',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['tars'], operation: ['smartClone'] } },
				description: 'Category for the cloned document',
			},

		],
		usableAsTool: true,
	};

	// ─── execute ────────────────────────────────────────────────────────────────

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;

			let responseData: IDataObject | IDataObject[] | Buffer;

			// ── DOCUMENT ─────────────────────────────────────────────────────
			if (resource === 'document') {
				if (operation === 'list') {
					const limit = this.getNodeParameter('limit', i) as number;
					const offset = this.getNodeParameter('offset', i) as number;
					responseData = await docmiralRequest(this, 'GET', '/entities', undefined, { limit, offset });
				} else if (operation === 'get') {
					const id = this.getNodeParameter('entityId', i) as string;
					responseData = await docmiralRequest(this, 'GET', `/entities/${id}`);
				} else if (operation === 'create') {
					const templateId = this.getNodeParameter('templateId', i) as string;
					const name = this.getNodeParameter('name', i) as string;
					const init = this.getNodeParameter('init', i) as boolean;
					const body: IDataObject = { templateId, init };
					if (name) body.name = name;
					if (!init) {
						const dataJson = this.getNodeParameter('dataJson', i, '{}') as string;
						const settingsJson = this.getNodeParameter('settingsJson', i, '{}') as string;
						const data = typeof dataJson === 'string' ? JSON.parse(dataJson) : dataJson;
						const settings = typeof settingsJson === 'string' ? JSON.parse(settingsJson) : settingsJson;
						const hasData = Object.keys(data as object).length > 0;
						const hasSettings = Object.keys(settings as object).length > 0;
						if (hasData || hasSettings) {
							body.data = {
								...(hasSettings ? { settings } : {}),
								...(data as object),
							};
						}
					}
					responseData = await docmiralRequest(this, 'POST', '/entities/', body);
				} else if (operation === 'update') {
					const id = this.getNodeParameter('entityId', i) as string;
					const dataJson = this.getNodeParameter('dataJson', i) as string;
					const data = typeof dataJson === 'string' ? JSON.parse(dataJson) : dataJson;
					responseData = await docmiralRequest(this, 'PUT', `/entities/${id}`, { data });
				} else if (operation === 'delete') {
					const id = this.getNodeParameter('entityId', i) as string;
					responseData = await docmiralRequest(this, 'DELETE', `/entities/${id}`);
				} else if (operation === 'buildPdf') {
					const buildSource = this.getNodeParameter('buildSource', i) as string;
					let id: string;
					if (buildSource === 'direct') {
						const body = await buildDocumentBody(this, i, 'build');
						const created = await docmiralRequest(this, 'POST', '/entities/', body);
						id = (created.data as IDataObject).id as string;
					} else {
						id = this.getNodeParameter('buildEntityId', i) as string;
					}
					const res = await docmiralRequest(this, 'POST', `/entities/${id}/build/pdf`);
					const url = (res.data as IDataObject).url as string;
					const buffer = await downloadBinary(this, url);
					const binaryData = await this.helpers.prepareBinaryData(buffer, `document-${id}.pdf`, 'application/pdf');
					if (buildSource === 'direct' && !this.getNodeParameter('keepDocument', i, true)) {
						await docmiralRequest(this, 'DELETE', `/entities/${id}`);
					}
					returnData.push({ json: { url, documentId: id }, binary: { data: binaryData }, pairedItem: { item: i } });
					continue;
				} else if (operation === 'buildPptx') {
					const buildSource = this.getNodeParameter('buildSource', i) as string;
					let id: string;
					if (buildSource === 'direct') {
						const body = await buildDocumentBody(this, i, 'build');
						const created = await docmiralRequest(this, 'POST', '/entities/', body);
						id = (created.data as IDataObject).id as string;
					} else {
						id = this.getNodeParameter('buildEntityId', i) as string;
					}
					const res = await docmiralRequest(this, 'POST', `/entities/${id}/build/pptx`);
					const url = (res.data as IDataObject).url as string;
					const buffer = await downloadBinary(this, url);
					const binaryData = await this.helpers.prepareBinaryData(buffer, `document-${id}.pptx`, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
					if (buildSource === 'direct' && !this.getNodeParameter('keepDocument', i, true)) {
						await docmiralRequest(this, 'DELETE', `/entities/${id}`);
					}
					returnData.push({ json: { url, documentId: id }, binary: { data: binaryData }, pairedItem: { item: i } });
					continue;
				} else if (operation === 'buildImage') {
					const buildSource = this.getNodeParameter('buildSource', i) as string;
					let id: string;
					if (buildSource === 'direct') {
						const body = await buildDocumentBody(this, i, 'build');
						const created = await docmiralRequest(this, 'POST', '/entities/', body);
						id = (created.data as IDataObject).id as string;
					} else {
						id = this.getNodeParameter('buildEntityId', i) as string;
					}
					const page = this.getNodeParameter('page', i) as number;
					const res = await docmiralRequest(this, 'POST', `/entities/${id}/build/image`, { page });
					const url = (res.data as IDataObject).url as string;
					const buffer = await downloadBinary(this, url);
					const binaryData = await this.helpers.prepareBinaryData(buffer, `document-${id}-p${page}.png`, 'image/png');
					if (buildSource === 'direct' && !this.getNodeParameter('keepDocument', i, true)) {
						await docmiralRequest(this, 'DELETE', `/entities/${id}`);
					}
					returnData.push({ json: { url, documentId: id, page }, binary: { data: binaryData }, pairedItem: { item: i } });
					continue;
				} else if (operation === 'clone') {
					const id = this.getNodeParameter('entityId', i) as string;
					responseData = await docmiralRequest(this, 'POST', `/entities/${id}/clone`);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
				}
			}

			// ── TEMPLATE ──────────────────────────────────────────────────────
			else if (resource === 'template') {
				if (operation === 'list') {
					const limit = this.getNodeParameter('limit', i) as number;
					const offset = this.getNodeParameter('offset', i) as number;
					const templateListCategoryId = this.getNodeParameter('templateListCategoryId', i, '') as string;
					const templateLibrary = this.getNodeParameter('templateLibrary', i, 'public') as string;
					const templateListQs: IDataObject = { limit, offset };
					if (templateListCategoryId) templateListQs.categoryId = templateListCategoryId;
					if (templateLibrary === 'mylist') templateListQs.mylist = true;
					responseData = await docmiralRequest(this, 'GET', '/templates', undefined, templateListQs);
				} else if (operation === 'get') {
					const id = this.getNodeParameter('templateId', i) as string;
					responseData = await docmiralRequest(this, 'GET', `/templates/${id}`);
				} else if (operation === 'create') {
					const name = this.getNodeParameter('templateName', i) as string;
					const categoryId = this.getNodeParameter('categoryId', i) as string;
					const html = this.getNodeParameter('templateHtml', i) as string;
					const settingsRaw = this.getNodeParameter('templateSettings', i) as string;
					const settings = typeof settingsRaw === 'string' ? JSON.parse(settingsRaw) : settingsRaw;
					const body: IDataObject = {};
					if (name) body.name = name;
					if (categoryId) body.categoryId = categoryId;
					if (html) body.html = html;
					if (Object.keys(settings as object).length) body.settings = settings;
					responseData = await docmiralRequest(this, 'POST', '/templates/', body);
				} else if (operation === 'update') {
					const id = this.getNodeParameter('templateId', i) as string;
					const fields = this.getNodeParameter('updateFields', i) as IDataObject;
					const body: IDataObject = {};
					for (const [key, val] of Object.entries(fields)) {
						if (val === '' || val === null || val === undefined) continue;
						if (key === 'settings' && typeof val === 'string') {
							body[key] = JSON.parse(val);
						} else {
							body[key] = val;
						}
					}
					responseData = await docmiralRequest(this, 'PUT', `/templates/${id}`, body);
				} else if (operation === 'delete') {
					const id = this.getNodeParameter('templateId', i) as string;
					responseData = await docmiralRequest(this, 'DELETE', `/templates/${id}`);
				} else if (operation === 'clone') {
					const id = this.getNodeParameter('templateId', i) as string;
					responseData = await docmiralRequest(this, 'POST', `/templates/${id}/clone`);
				} else if (operation === 'buildPdf') {
					const id = this.getNodeParameter('templateId', i) as string;
					const res = await docmiralRequest(this, 'POST', `/templates/${id}/build/pdf`);
					const url = (res.data as IDataObject).url as string;
					const buffer = await downloadBinary(this, url);
					const binaryData = await this.helpers.prepareBinaryData(buffer, `template-${id}.pdf`, 'application/pdf');
					returnData.push({ json: { url, templateId: id }, binary: { data: binaryData }, pairedItem: { item: i } });
					continue;
				} else if (operation === 'buildImage') {
					const id = this.getNodeParameter('templateId', i) as string;
					const res = await docmiralRequest(this, 'POST', `/templates/${id}/build/image`);
					const list = ((res.data as IDataObject).list as string[]) ?? [];
					for (let p = 0; p < list.length; p++) {
						const url = list[p];
						const buffer = await downloadBinary(this, url);
						const binaryData = await this.helpers.prepareBinaryData(buffer, `template-${id}-p${p + 1}.png`, 'image/png');
						returnData.push({ json: { url, templateId: id, page: p + 1 }, binary: { data: binaryData }, pairedItem: { item: i } });
					}
					continue;
				} else if (operation === 'getSchema') {
					const id = this.getNodeParameter('templateId', i) as string;
					const schemaFormat = this.getNodeParameter('schemaFormat', i) as string;
					const output = this.getNodeParameter('schemaOutput', i) as string;
					const qs: IDataObject = { schemaFormat, output };
					if (output === 'sample') {
						const defaultValue = this.getNodeParameter('defaultValue', i, false) as boolean;
						qs.defaultValue = defaultValue ? 'true' : 'false';
					}
					responseData = await docmiralRequest(this, 'GET', `/templates/schema/${id}`, undefined, qs);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
				}
			}



			// ── TARS ──────────────────────────────────────────────────────────
			else if (resource === 'tars') {
				if (operation === 'chat') {
					const entityId = this.getNodeParameter('entityId', i) as string;
					const message = this.getNodeParameter('message', i) as string;
					responseData = await docmiralRequest(this, 'POST', '/tars/chat-layerer', {
						entity_id: entityId,
						message,
					});
				} else if (operation === 'parseCV') {
					const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;
					const binaryData = items[i].binary as IBinaryKeyData;
					if (!binaryData?.[binaryProperty]) {
						throw new NodeOperationError(this.getNode(), `No binary data found at property "${binaryProperty}"`);
					}
					const fileBuffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);
					const credentialsParseCV = await this.getCredentials('docmiralApi');
					const baseUrlParseCV = (credentialsParseCV.baseUrl as string).replace(/\/$/, '');
					const form_parseCV = new FormData();
					form_parseCV.append('file', new Blob([fileBuffer], { type: binaryData[binaryProperty].mimeType }), binaryData[binaryProperty].fileName ?? 'resume.pdf');
					responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'docmiralApi', {
						method: 'POST',
						url: `${baseUrlParseCV}/tars/parse-cv`,
						body: form_parseCV,
					}) as IDataObject;
				} else if (operation === 'extractText') {
					const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;
					const binaryData = items[i].binary as IBinaryKeyData;
					if (!binaryData?.[binaryProperty]) {
						throw new NodeOperationError(this.getNode(), `No binary data found at property "${binaryProperty}"`);
					}
					const fileBuffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);
					const credentialsExtract = await this.getCredentials('docmiralApi');
					const baseUrlExtract = (credentialsExtract.baseUrl as string).replace(/\/$/, '');
					const form_extractText = new FormData();
					form_extractText.append('file', new Blob([fileBuffer], { type: binaryData[binaryProperty].mimeType }), binaryData[binaryProperty].fileName ?? 'document.pdf');
					responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'docmiralApi', {
						method: 'POST',
						url: `${baseUrlExtract}/tars/extract-text`,
						body: form_extractText,
					}) as IDataObject;
				} else if (operation === 'smartClone') {
					const entityId = this.getNodeParameter('entityId', i) as string;
					const message = this.getNodeParameter('message', i) as string;
					const category = this.getNodeParameter('category', i) as string;
					responseData = await docmiralRequest(this, 'POST', '/tars/smartclone', {
						entity_id: entityId,
						message,
						...(category ? { category } : {}),
					});
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
				}
			}
 else if (resource === 'category') {
				if (operation === 'list') {
					responseData = await docmiralRequest(this, 'GET', '/categories');
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
				}
			} else {
				throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
			}

			// Normalise array vs single object responses
			const items_ = Array.isArray(responseData) ? responseData : [responseData as IDataObject];
			returnData.push(...items_.map((item, i) => ({ json: item, pairedItem: { item: i } })));
		}

		return [returnData];
	}
}
