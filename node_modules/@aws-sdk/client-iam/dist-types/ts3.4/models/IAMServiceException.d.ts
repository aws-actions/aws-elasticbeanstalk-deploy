import {
  ServiceExceptionOptions as __ServiceExceptionOptions,
  ServiceException as __ServiceException,
} from "@smithy/smithy-client";
export { __ServiceExceptionOptions };
export { __ServiceException };
export declare class IAMServiceException extends __ServiceException {
  constructor(options: __ServiceExceptionOptions);
}
