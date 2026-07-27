import { IsMongoId, IsNotEmpty } from "class-validator";
import { Types } from "mongoose";

export class CreateReferralDto {

    @IsMongoId()
    @IsNotEmpty()
    referrar: Types.ObjectId

    @IsMongoId()
    @IsNotEmpty()
    refrree: Types.ObjectId

    discount?: Types.ObjectId

}