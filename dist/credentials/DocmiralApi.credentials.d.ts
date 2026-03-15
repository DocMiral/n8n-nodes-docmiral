import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';
export declare class DocmiralApi implements ICredentialType {
    name: string;
    displayName: string;
    icon: "file:docmiral.png";
    documentationUrl: string;
    properties: INodeProperties[];
    authenticate: IAuthenticateGeneric;
    test: ICredentialTestRequest;
}
//# sourceMappingURL=DocmiralApi.credentials.d.ts.map