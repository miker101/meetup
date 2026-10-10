package com.meetup.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {


@Override
public void addCorsMappings(CorsRegistry registry) {

    registry.addMapping("/**")
	    .allowedOriginPatterns(
	    		"http://127.0.0.1:*",
	    		"http://localhost:*",
	    		"https://meetup-weld-zeta.vercel.app"
	    		)


            .allowedMethods(
                    "GET",
                    "POST",
                    "PUT",
                    "DELETE",
                    "OPTIONS"
            )
            .allowedHeaders("*");
}


}
