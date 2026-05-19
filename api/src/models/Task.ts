import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ITask extends Document {
  userId:      mongoose.Types.ObjectId;
  projectId?:  mongoose.Types.ObjectId;
  title:       string;
  description?: string;
  dueDate?:    string; // YYYY-MM-DD
  priority:    'low' | 'medium' | 'high';
  completed:   boolean;
  completedAt?: Date;
  createdAt:   Date;
  updatedAt:   Date;
}

const taskSchema = new Schema<ITask>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User',    required: true },
    projectId:   { type: Schema.Types.ObjectId, ref: 'Project', default: null  },
    title:       { type: String, required: true },
    description: String,
    dueDate:     String,
    priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    completed:   { type: Boolean, default: false },
    completedAt: Date,
  },
  { timestamps: true }
);

taskSchema.index({ userId: 1, completed: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });

export const Task: Model<ITask> = mongoose.model<ITask>('Task', taskSchema);
