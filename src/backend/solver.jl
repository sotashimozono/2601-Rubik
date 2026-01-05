# src/backend/solver.jl
using GAP
using JSON3

# --- 1. 定義・初期化系（純粋関数） ---

"""JSONのサイクルからGAPの置換を作る"""
function reconstruct_gap_perm(cycles)
    gap_str = join(["(" * join(c, ",") * ")" for c in cycles], "")
    return gap_str == "" ? (@gap ()) : GAP.evalstr(gap_str)
end

"""GAPの準同型写像（ソルバーの核）を作成する"""
function create_homomorphism(operators)
    names_jl = ["U", "L", "F", "R", "B", "D"]
    gen_list = [operators[n] for n in names_jl]
    
    names_gap = @gap ["U", "L", "F", "R", "B", "D"]
    cube_group = (@gap Group)(gen_list...)
    free_group = (@gap FreeGroup)(names_gap)
    return (@gap GroupHomomorphismByImages)(
        free_group, 
        cube_group, 
        (@gap GeneratorsOfGroup)(free_group), 
        (@gap GeneratorsOfGroup)(cube_group)
    )
end

# --- 2. 状態管理（構造体） ---

mutable struct RubikCube
    state::Vector{Int}
    operators::Dict{String, Any}
    hom::Any
    current_perm::Any
    scramble::String # メタデータとして保持

    function RubikCube(config_path::String, solve_json_path::String)
        config = JSON3.read(read(config_path, String))
        solve_data = JSON3.read(read(solve_json_path, String))
        
        ops = Dict(String(k) => reconstruct_gap_perm(v) for (k, v) in config.definitions)
        hom = create_homomorphism(ops)
        
        new(Vector{Int}(solve_data.current), ops, hom, (@gap ()), solve_data.scramble)
    end
end
# --- 3. 操作・計算メソッド ---

"""手順を適用して状態と累積置換を更新する"""
function apply_moves!(cube::RubikCube, move_names::Vector{String})
    history = Vector{Vector{Int}}() # 状態の軌跡を保存
    for m in move_names
        perm = get(cube.operators, m, (@gap ()))
        
        # 物理的なステッカー移動
        p_map = [Int(i^perm) for i in 1:48]
        next_state = copy(cube.state)
        for i in 1:48
            next_state[p_map[i]] = cube.state[i]
        end
        cube.state = next_state
        cube.current_perm *= perm
        # 現在の状態を記録
        push!(history, copy(cube.state))
    end
    return history # 全ステップの配列を返す
end

"""現在の累積置換から最短（に近い）解法を導く"""
function find_solution(cube::RubikCube)
    inv_perm = cube.current_perm^-1
    word_raw = string((@gap PreImagesRepresentative)(cube.hom, inv_perm))
    return gap_to_lsystem(word_raw)
end

function gap_to_lsystem(word_str)
    res = replace(word_str, "*" => " ", "^-1" => "-", "^-2" => "++", "^2" => "++")
    return join([occursin(r"[\+\-]", m) ? m : m * "+" for m in split(res)], " ")
end