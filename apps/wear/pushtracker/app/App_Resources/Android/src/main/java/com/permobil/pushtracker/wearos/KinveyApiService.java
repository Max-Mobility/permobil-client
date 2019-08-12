package com.permobil.psds.wearos;

import io.reactivex.Observable;
import okhttp3.RequestBody;
import retrofit2.http.Body;
import retrofit2.http.Header;
import retrofit2.http.Headers;
import retrofit2.http.PUT;
import retrofit2.http.Path;

public interface KinveyApiService {
    @Headers({
            "Content-Type:application/json"
    })
    @PUT(Constants.API_DATA_ENDPOINT + "/{id}")
    Observable<DailyActivity> sendData(@Header("Authorization") String authorization, String id, @Body DailyActivity data);

    @PUT(Constants.API_DATA_ENDPOINT + "/{id}")
    Observable<DailyActivity> sendData(@Header("Authorization") String authorization, @Body RequestBody data, @Path("id") String id);
}
