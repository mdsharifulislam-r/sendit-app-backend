
import { Injectable } from "@nestjs/common";
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WsException } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { SocketService } from "utils/helper-modules/socket/socket.service";
import { BOOKING_STATUS, LocationUpdateDto } from "./booking.dto";
import { InjectModel } from "@nestjs/mongoose";
import { User, UserDocument } from "apps/root/src/user/user.entity";
import { Model } from "mongoose";
import { Booking } from "./booking.entity";


@Injectable()
@WebSocketGateway({ cors: { origin: '*' } })
export class BookingSocketHandler {

    constructor(
        private readonly socketService: SocketService,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
    ) { }


    @SubscribeMessage('message')
    async handleMessage(
        @MessageBody() data: LocationUpdateDto,
        @ConnectedSocket() client: Socket,
    ) {

        if (!data.user_id || !data.location.latitude || !data.location.longitude) {
            throw new WsException('Invalid data')
        }

        const user = await this.userModel.findById(data.user_id, { name: 1 });
        if (!user) {
            throw new WsException('User not found')
        }


        const bookings = await this.bookingModel.find({ transporter: user._id, status: BOOKING_STATUS.CONFIRMED }, { pickup_location: 1, dropoff_location: 1, pickup_address: 1, dropoff_address: 1, _id: 1, id: 1 }).lean()

        for (let booking of bookings) {
            this.socketService.emit(`booking_location_update::${booking._id}`, {
                booking, transpoter: {
                    user_id: user._id,
                    location: data.location,
                    name: user?.name,
                    image: user?.image
                }
            })
        }



    }




}