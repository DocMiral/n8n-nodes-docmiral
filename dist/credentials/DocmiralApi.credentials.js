"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocmiralApi = void 0;
class DocmiralApi {
    constructor() {
        this.name = 'docmiralApi';
        this.displayName = 'DocMiral API';
        this.icon = 'file:docmiral.png';
        this.documentationUrl = 'https://docmiral.com';
        this.properties = [
            {
                displayName: 'API Token',
                name: 'apiToken',
                type: 'string',
                typeOptions: { password: true },
                default: '',
                required: true,
                description: 'Your DocMiral API token. Generate one at https://docmiral.com/profile/apikeys',
            },
            {
                displayName: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: 'https://api.docmiral.com/api',
                description: 'Base API URL of the DocMiral instance',
            },
        ];
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    Authorization: '=Bearer {{$credentials.apiToken}}',
                },
            },
        };
        this.test = {
            request: {
                baseURL: '={{$credentials.baseUrl}}',
                url: '/categories',
            },
        };
    }
}
exports.DocmiralApi = DocmiralApi;
//# sourceMappingURL=DocmiralApi.credentials.js.map