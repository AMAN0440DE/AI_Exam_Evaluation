import { configureStore } from '@reduxjs/toolkit';
import { userReducer } from './redux/user/reducers';

export const store = configureStore({
    reducer: {
        userDetails: userReducer
    }
});