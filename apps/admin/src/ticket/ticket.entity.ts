import { Document, Types, Schema as MongooseSchema } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export type TicketDocument = Ticket & Document;

export enum TicketStatus {
    OPEN = 'open',
    CLOSED = 'closed',
}

export enum TicketPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
}

@Schema({ timestamps: true, collection: "tickets" })
export class Ticket {
    @Prop({ type: String, unique: true, required: false })
    ticket_id: string
    @Prop({ type: String, required: true, trim: true })
    title: string;

    @Prop({ type: String, required: true })
    description: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Booking', required: true })
    booking: Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    report_owner: Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Report', required: true })
    report: Types.ObjectId;

    @Prop({ type: String, enum: TicketStatus, default: TicketStatus.OPEN })
    status: TicketStatus;

    @Prop({ type: String, enum: TicketPriority, default: TicketPriority.MEDIUM })
    priority: TicketPriority;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
    report_to: Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trip', required: false })
    trip: Types.ObjectId;

    @Prop({ type: Object, required: false })
    price_breakdown: {
        subtotal: number;
        service_charge: number;
        discount: number;
        tax: number;
        total: number;
    };

    @Prop({ type: Number, required: false, default: 0 })
    refund_amount: number;

    @Prop({ type: Boolean, required: false, default: false })
    is_refund_processed: boolean;

}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

TicketSchema.pre("save", function (next: any) {
    if (this.isNew && !this.ticket_id) {
        this.ticket_id = `TKT-${Math.floor(Math.random() * 1000000000)}`;
    }
    next();
});