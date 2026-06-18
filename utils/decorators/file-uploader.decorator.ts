import { applyDecorators, HttpStatus, UseInterceptors } from '@nestjs/common';
import {
  FileInterceptor,
  FilesInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { ApiError } from '../errors/api-error';

interface UploadField {
  fieldName: string;
  maxCount?: number;
  allowedMimeTypes?: RegExp;
}

interface UploadOptions {
  /** Multiple named fields (e.g. avatar + cover) */
  fields?: UploadField[];
  /** Single field name for one or many files */
  fieldName?: string;
  /** Allow multiple files on the same field */
  multiple?: boolean;
  maxCount?: number;
  destination?: string;
  maxSizeMB?: number;
  allowedMimeTypes?: RegExp;
}

/**
 * Decorator that wires multer file upload with automatic folder creation,
 * MIME type validation, and size limit.
 *
 * @example
 * @FileUpload({ fieldName: 'image' })
 * @FileUpload({ fields: [{ fieldName: 'avatar' }, { fieldName: 'cover' }] })
 */
export function FileUpload(options: UploadOptions) {
  const {
    fields,
    fieldName,
    multiple = false,
    maxCount = 10,
    destination = './uploads',
    maxSizeMB = 5,
    allowedMimeTypes = /\/(jpg|jpeg|png|gif|webp|pdf)/,
  } = options;

  const storage = diskStorage({
    destination: (_req, file, cb) => {
      const uploadPath = join(destination, file.fieldname);
      if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
    },
  });

  const fileFilter = (
    _req: any,
    file:any,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    let rule = allowedMimeTypes;

    if (fields?.length) {
      const field = fields.find((f) => f.fieldName === file.fieldname);
      if (field?.allowedMimeTypes) rule = field.allowedMimeTypes;
    }

    if (!file.mimetype.match(rule)) {
      return cb(
        new ApiError(HttpStatus.BAD_REQUEST, `Unsupported file type: ${file.mimetype}`),
        false,
      );
    }
    cb(null, true);
  };

  const limits = { fileSize: maxSizeMB * 1024 * 1024 };

  let interceptor: any;

  if (fields?.length) {
    interceptor = FileFieldsInterceptor(
      fields.map((f) => ({ name: f.fieldName, maxCount: f.maxCount ?? 1 })),
      { storage, fileFilter, limits },
    );
  } else if (multiple && fieldName) {
    interceptor = FilesInterceptor(fieldName, maxCount, { storage, fileFilter, limits });
  } else {
    interceptor = FileInterceptor(fieldName!, { storage, fileFilter, limits });
  }

  return applyDecorators(UseInterceptors(interceptor));
}
