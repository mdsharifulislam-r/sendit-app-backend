import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsPositive } from "class-validator";

export class DepositIntoWalletDto {
    @ApiProperty({
        example: 5000,
        required: true,
        description: "Amount to be deposited into the wallet",
    })
    @IsNotEmpty({ message: "Amount is required" })
    @IsNumber({}, { message: "Amount must be a number" })
    @IsPositive({ message: "Amount must be greater than 0" })
    amount: number
}


export class WithdrawFromWalletDto {
    @ApiProperty({
        example: 5000,
        required: true,
        description: "Amount to be withdrawn from the wallet",
    })
    @IsNotEmpty({ message: "Amount is required" })
    @IsNumber({}, { message: "Amount must be a number" })
    @IsPositive({ message: "Amount must be greater than 0" })
    amount: number
}