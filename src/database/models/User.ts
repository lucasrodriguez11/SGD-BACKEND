/**
 * User Model
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { IUser } from '@/types';

const userSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
        passwordHash: { type: String, required: true },
        despachoId: { type: Schema.Types.ObjectId, ref: 'Despacho', required: false, index: true },
        role: { type: String, enum: ['ADMIN', 'USER'], default: 'USER', index: true },
        active: { type: Boolean, default: true, index: true },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: 'users',
    }
);

userSchema.virtual('id').get(function () {
    return this._id?.toString();
});

userSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret: any) => {
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
    },
});

export const UserModel: Model<IUser> = mongoose.model<IUser>('User', userSchema);


