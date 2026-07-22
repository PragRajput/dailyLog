import mongoose, { Document, Model, Schema } from 'mongoose';
import { IProject } from './Project';

export interface IEntry extends Document {
  userId:      mongoose.Types.ObjectId;
  projectId:   mongoose.Types.ObjectId | IProject;
  taskId?:     mongoose.Types.ObjectId;
  date:        string;   // YYYY-MM-DD string — avoids timezone issues
  description: string;
  hours?:      number;
  createdAt:   Date;
  updatedAt:   Date;
}

const entrySchema = new Schema<IEntry>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User',    required: true },
    projectId:   { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    taskId:      { type: Schema.Types.ObjectId, ref: 'Task',    default: null  },
    date:        { type: String, required: true },
    description: { type: String, default: '' },
    hours:       { type: Number, default: null },
  },
  { timestamps: true }
);

entrySchema.index({ userId: 1, date: 1 });
entrySchema.index({ userId: 1, projectId: 1 });

export const Entry: Model<IEntry> = mongoose.model<IEntry>('Entry', entrySchema);
