using Oxygen
using HTTP
using JSON3
using GAP

include("solver.jl") 

# PATHS
const BASE_DIR = @__DIR__ 
const SOLVE_PATH = joinpath(BASE_DIR, "..", "config", "solve.json")
const CONFIG_PATH = joinpath(BASE_DIR, "..", "config", "config.json")
const DISPLAY_PATH = joinpath(BASE_DIR, "..", "config", "display.json")

@post "/update-settings" function(req::HTTP.Request)
    try
        new_settings = JSON3.read(req.body)
        current_settings = JSON3.read(read(DISPLAY_PATH, String), Dict)
        merge!(current_settings, Dict(new_settings))
        
        open(DISPLAY_PATH, "w") do f
            JSON3.pretty(f, current_settings)
        end
        return Dict("status" => "success")
    catch e
        return HTTP.Response(500, "Failed to update settings")
    end
end

initial_data = JSON3.read(read(SOLVE_PATH, String))
const my_cube = RubikCube(CONFIG_PATH, SOLVE_PATH)

function cors_middleware(handler)
    return function(req::HTTP.Request)
        if HTTP.method(req) == "OPTIONS"
            return HTTP.Response(200, [
                "Access-Control-Allow-Origin" => "*",
                "Access-Control-Allow-Methods" => "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers" => "*",
                "Access-Control-Max-Age" => "86400"
            ])
        end
        
        response = handler(req)
        
        res = response isa HTTP.Response ? response : HTTP.Response(200, JSON3.write(response))
        
        HTTP.setheader(res, "Access-Control-Allow-Origin" => "*")
        HTTP.setheader(res, "Content-Type" => "application/json")
        return res
    end
end

@get "/get-state" function(req::HTTP.Request)
    return Dict(
        "current" => my_cube.state,
        "scramble" => my_cube.scramble,
        "solution" => find_solution(my_cube)
    )
end

# 1. 移動を実行し、中間状態（軌跡）を返す
@post "/apply-moves" function(req::HTTP.Request)
    try
        body = JSON3.read(req.body)
        moves = Vector{String}(body.moves)
        
        history = apply_moves!(my_cube, moves)
        new_data = Dict("current" => my_cube.state, "scramble" => my_cube.scramble)
        open(SOLVE_PATH, "w") do f; JSON3.pretty(f, new_data); end

        return Dict("status" => "success", "history" => history, "current" => my_cube.state)
    catch e
        return HTTP.Response(500, "Error")
    end
end

@get "/solve" function(req::HTTP.Request)
    try
        sol = find_solution(my_cube)
        return Dict("solution" => sol)
    catch e
        return HTTP.Response(500, "Solver Error")
    end
end
serve(host="0.0.0.0", port=8080, middleware=[cors_middleware], revise=true)