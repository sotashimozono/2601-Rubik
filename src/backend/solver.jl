using GAP
using JSON3

# --- 1. 置換・群論的初期化ロジック ---

"""JSONのサイクル定義からGAPの置換オブジェクトを構築する"""
function reconstruct_gap_perm(cycles)
    gap_str = join(["(" * join(c, ",") * ")" for c in cycles], "")
    return gap_str == "" ? (@gap ()) : GAP.evalstr(gap_str)
end

"""GAPの準同型写像を作成する（名前リストの型エラー回避版）"""
function create_homomorphism(operators)
    names_jl = ["U", "L", "F", "R", "B", "D"]
    # GAP側のリストとして名前を定義
    names_gap = GAP.evalstr("[\"U\", \"L\", \"F\", \"R\", \"B\", \"D\"]")
    
    gen_list = [operators[n] for n in names_jl]
    
    free_group = (@gap FreeGroup)(names_gap)
    cube_group = (@gap Group)(gen_list...)
    
    return (@gap GroupHomomorphismByImages)(
        free_group, 
        cube_group, 
        (@gap GeneratorsOfGroup)(free_group), 
        (@gap GeneratorsOfGroup)(cube_group)
    )
end

# --- 2. 状態管理構造体 ---

mutable struct RubikCube
    state::Vector{Int}
    operators::Dict{String, Any}
    hom::Any
    scramble::String

    function RubikCube(config_path::String, solve_json_path::String)
        config = JSON3.read(read(config_path, String))
        solve_data = JSON3.read(read(solve_json_path, String))
        
        ops = Dict(String(k) => reconstruct_gap_perm(v) for (k, v) in config.definitions)
        hom = create_homomorphism(ops)
        scramble = get(solve_data, :scramble, "")
        
        new(Vector{Int}(solve_data.current), ops, hom, scramble)
    end
end

# --- 3. 物理演算とパースロジック ---

"""手順を適用して状態ベクトルを更新し、履歴を返す"""
function apply_moves!(cube::RubikCube, move_names::Vector{String})
    history = Vector{Vector{Int}}()
    for m in move_names
        m = strip(m)
        if isempty(m) continue end
        
        # 逆回転判定: ' または -
        is_inverse = endswith(m, "-") || endswith(m, "'")
        base_move = is_inverse ? m[1:end-1] : m
        
        perm = get(cube.operators, base_move, nothing)
        if perm === nothing continue end
        
        actual_perm = is_inverse ? inv(perm) : perm
        
        # 右作用によるステッカー移動: $i \to i^\sigma$
        p_map = [Int(i^actual_perm) for i in 1:48]
        next_state = copy(cube.state)
        for i in 1:48
            next_state[p_map[i]] = cube.state[i]
        end
        cube.state = next_state
        push!(history, copy(cube.state))
    end
    return history
end

"""
GAPの複雑な表記を一手ずつの配列に分解する（Regexエンジン）
U^3 -> U-, R^-1 -> R-, U^2 -> U U
"""
function gap_to_lsystem(word_str::String)
    res = replace(word_str, "*" => " ", "(" => "", ")" => "")
    final_moves = String[]
    
    for p in split(res)
        # 正規表現で面と指数を抽出
        m = match(r"([A-Z])(?:\^?([\-\d]+))?", p)
        if m === nothing continue end
        
        face = m.captures[1]
        pow_str = m.captures[2]
        
        pow = pow_str === nothing ? 1 : parse(Int, pow_str)
        pow = pow % 4
        if pow < 0 pow += 4 end
        
        if pow == 1       # 90度時計回り
            push!(final_moves, face)
        elseif pow == 2   # 180度
            push!(final_moves, face); push!(final_moves, face)
        elseif pow == 3   # 270度（反時計回り）
            push!(final_moves, face * "-")
        end
    end
    return final_moves
end

"""冗長な手順を短縮する（例: U U U -> U-）"""
function optimize_moves(move_list::Vector{String})
    if isempty(move_list) return String[] end
    
    optimized = String[]
    i = 1
    while i <= length(move_list)
        face = move_list[i][1:1]
        count = 0
        j = i
        while j <= length(move_list) && move_list[j][1:1] == face
            count += (endswith(move_list[j], "-") ? -1 : 1)
            j += 1
        end

        val = count % 4
        if val < 0; val += 4; end
        
        if val == 1
            push!(optimized, face)
        elseif val == 2
            push!(optimized, face); push!(optimized, face)
        elseif val == 3
            push!(optimized, face * "-")
        end
        i = j
    end
    return optimized
end

# --- 4. 解法エンジン ---

"""現在の状態から解法（最適化済み）を導き出す"""
function find_solution(cube::RubikCube)
    # SUCCESSを勝ち取ったロジック：
    # state配列そのものをGAPの置換gにし、gをターゲットとして解く
    gap_list = GAP.evalstr("[" * join(cube.state, ",") * "]")
    g = (@gap PermList)(gap_list)
    
    # 単位元からgへ至る語を計算
    word = (@gap PreImagesRepresentative)(cube.hom, g)
    word_raw = String((@gap String)(word))
    
    # パースと最適化
    moves = gap_to_lsystem(word_raw)
    optimized = optimize_moves(moves)
    
    return join(optimized, " ")
end