"use strict";

var WeatherApp = (function() {
  var WeatherClass = function() {
    this.API_ID   = "ce13beb03e7cdbcdf358518d11b9c548";
    this.API_BASE = "http://api.openweathermap.org/data/2.5";
    
    this.FORECAST_SAMPLE = 3;
    this.RAIN_KEYWORD = "rain";
    this.SNOW_KEYWORD = "snow";
    this.DRIZZLE_KEYWORD = "drizzle";
    
    this.country_code = "";
  };

  WeatherClass.prototype.get_country_code = function() {
    return $.getJSON('http://ip-api.com/json', function(result) {
      this.country_code = result.countryCode || result.country_code;
    });
  };
  
  WeatherClass.prototype.convert_temperature = function(temp_k) {
    //return (temp_f - 32) * (5.0/9.0)
    return (temp_k - 273.15)
  }

  WeatherClass.prototype.make_weather_request = function(city_name, success_callback, error_callback) {
    // Retrieve the user's country
    var url = this.API_BASE + "/forecast";
    var api_id = this.API_ID;
    
    $.when(this.get_country_code()).fail(error_callback).done(function() {
      $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        data: { q: city_name + ',' + this.country_code, APPID: api_id},
        error: function(jqXHR, textStatus, errorThrown ) {
          if ( typeof error_callback !== 'undefined' && error_callback != null ) error_callback(jqXHR, textStatus, errorThrown);
        },
        success: function(data) {
          console.log(data);
          if ( typeof success_callback !== 'undefined' && success_callback != null ) success_callback(data);
        }
      });
    });
  };

  WeatherClass.prototype.add_sil = function(subsample, current_level) {
    var text = subsample.main.toLowerCase();
    // Check for rain
    if(text.indexOf(this.RAIN_KEYWORD) > -1 || text.indexOf(this.SNOW_KEYWORD) > -1 || text.indexOf(this.DRIZZLE_KEYWORD) > -1) 
      current_level++;
    
    return current_level;
  }

  WeatherClass.prototype.submit = function(city_name, hours_outside, success_callback, error_callback) {
    var self = this;

    this.make_weather_request(city_name, function(data) {
      var forecast_steps  = Math.floor(hours_outside/self.FORECAST_SAMPLE) + 1;
      var should_i_level   = 0;
      
      var max_temp = Number.NEGATIVE_INFINITY;
      var min_temp = Number.INFINITY;
      var avg_temp = 0;
      
      for(var i = 0; i < forecast_steps; ++i) {
        var sample = data.list[i];

        if(sample === undefined) continue;
        
        for(var j in sample.weather) {
          var subsample = sample.weather[j];

          should_i_level = self.add_sil(subsample, should_i_level);

          // Save temperatures
          max_temp = Math.max(max_temp, self.convert_temperature(sample.main.temp_max));
          min_temp = Math.min(self.convert_temperature(sample.main.temp_min));
          avg_temp += self.convert_temperature(sample.main.temp);
        }
      }
      
      // Temperature info
      avg_temp /= Math.floor(forecast_steps);
      
      // Percentage
      should_i_level = (0.0 + should_i_level) / forecast_steps;
      
      if (typeof success_callback !== 'undefined' && success_callback != null) success_callback(should_i_level, {
        max_temp: max_temp,
        min_temp: min_temp,
        avg_temp: avg_temp
      });
    }, error_callback);
  };

  return new WeatherClass();
})();