import { Duration as IDuration, Moment as IMoment } from 'moment';
import Appointment from 'structures/Appointment';

export interface IUpdateAppTargetProps {
  targetDate?: IMoment;
  targetPosition?: number;
  targetDuration?: IDuration;
}

export interface IUpdateAppDirectLinkProps {
  appointment?: Appointment;
}

export interface IUpdateAppRelativeProps {
  date?: IMoment;
  uniqueId?: string;
}

type IUpdateAppProps = IUpdateAppDirectLinkProps &
  IUpdateAppRelativeProps &
  IUpdateAppTargetProps;

export default IUpdateAppProps;
