package com.permobil.pushtracker;

import java.util.List;
import java.util.Map;

import io.reactivex.Observable;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.Header;
import retrofit2.http.Headers;
import retrofit2.http.PUT;
import retrofit2.http.GET;
import retrofit2.http.Path;
import retrofit2.http.Query;

public interface KinveyApiService {

  @PUT(Constants.API_DATA_ENDPOINT + "/{id}")
  Call<DailyActivity> sendData(
                               @Header("Authorization") String authorization,
                               @Body RequestBody data,
                               @Path("id") String id
                               );
}
