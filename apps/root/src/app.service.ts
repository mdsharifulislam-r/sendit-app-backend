import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
@Injectable()
export class AppService {
  getHello(res: Response): void {
    res.sendFile(path.join(process.cwd(), 'public/home.html'));
  }
}
