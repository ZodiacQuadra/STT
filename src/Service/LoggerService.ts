import { addItemToCollection } from '../Config/storage';

export interface IErrorLog {
  Title: string;
  Error_Source: string;
  Component_Name: string;
  Function_Name: string;
  Error_Message: string;
  Stack_Trace?: string;
  Request_Payload?: string;
}

export const logError = async (error: IErrorLog): Promise<void> => {
  try {
    console.error(`[UOP ErrorLog] [${error.Component_Name}.${error.Function_Name}]: ${error.Error_Message}`, error);
    addItemToCollection('UOP_ErrorLogs', {
      ...error,
      Timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to write error to local storage:', err);
  }
};
