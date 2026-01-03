declare module 'swagger-ui-react' {
  import { Component } from 'react';

  export interface SwaggerUIProps {
    spec?: any;
    url?: string;
    onComplete?: (system: any) => void;
    requestInterceptor?: (request: any) => any;
    responseInterceptor?: (response: any) => any;
    docExpansion?: 'list' | 'full' | 'none';
    defaultModelsExpandDepth?: number;
    defaultModelExpandDepth?: number;
    displayOperationId?: boolean;
    displayRequestDuration?: boolean;
    filter?: boolean | string;
    showExtensions?: boolean;
    showCommonExtensions?: boolean;
    tryItOutEnabled?: boolean;
    requestSnippetsEnabled?: boolean;
    requestSnippets?: {
      generators?: {
        [key: string]: {
          [key: string]: (request: any) => string;
        };
      };
      defaultExpanded?: boolean;
      languages?: string[];
    };
    deepLinking?: boolean;
    showMutatedRequest?: boolean;
    supportedSubmitMethods?: string[];
    validatorUrl?: string | null;
    withCredentials?: boolean;
    persistAuthorization?: boolean;
    [key: string]: any;
  }

  export default class SwaggerUI extends Component<SwaggerUIProps> {}
}

declare module 'swagger-ui-react/swagger-ui.css' {
  const content: string;
  export default content;
}

