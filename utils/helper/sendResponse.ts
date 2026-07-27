export interface IPagination {
  page: number;
  limit: number;
  totalPage: number;
  total: number;
}

export interface IResponseData<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  pagination?: IPagination;
  data?: T;
}

/**
 * Standardised response builder.
 * The ResponseInterceptor will reshape this into the final API response.
 */
const sendResponse = <T>(payload: IResponseData<T>): IResponseData<T> => payload;

export default sendResponse;
