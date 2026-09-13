/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const updateSettings = async (data, type) => {
  try {
    const url =
      type === 'password'
        ? 'http://localhost:3000/api/v1/users/updateMyPassword'
        : 'http://localhost:3000/api/v1/users/updateMe';

    const res = await axios({
      method: 'PATCH',
      url,
      data,
      withCredentials: true,
    });

    showAlert('success', `${type.toUpperCase()} updated successfully!`);
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
