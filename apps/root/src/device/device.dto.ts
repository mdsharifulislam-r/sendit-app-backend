import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateDeviceDto {
    @ApiProperty({
        description: "Give the device id",
        example: "1",
    })
    @IsNotEmpty()
    @IsString()
    device_id: string


    @ApiProperty({
        description: "Give the device name",
        example: "Device Name",
    })
    @IsNotEmpty()
    @IsString()
    device_name: string

    @ApiProperty({
        description: "Give the device address",
        example: "123 Main St",
    })
    @IsNotEmpty()
    @IsString()
    address: string

    @ApiProperty({
        description: "Give the device lat and log",
        example: {
            latitude: 12.9716,
            longitude: 77.5946
        },
    })
    @IsNotEmpty()
    location: { latitude: number, longitude: number }

    user: string

}