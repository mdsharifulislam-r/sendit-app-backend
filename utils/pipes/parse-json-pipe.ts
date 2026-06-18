import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

@Injectable()
export class ParseJsonPipe implements PipeTransform {
    transform(value: any) {
        try {
            console.log(value);

            return JSON.parse(value);
        } catch {
            throw new BadRequestException('Invalid JSON');
        }
    }
}