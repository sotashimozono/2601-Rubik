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
            dest = Int(i^actual_perm)
            next_state[dest] = cube.state[i]
        end
        cube.state = next_state
        push!(history, copy(cube.state))
    end
    return history
end

"""
GAPの内部表現 [gen_idx, pow, ...] を一手ずつの配列に変換する
create_homomorphism で定義した順序 (U, L, F, R, B, D) に対応
"""
function ext_rep_to_moves(ext_rep_data::Vector{Int})
    # create_homomorphism の names_jl = ["U", "L", "F", "R", "B", "D"] に対応
    mapping = Dict(1 => "U", 2 => "L", 3 => "F", 4 => "R", 5 => "B", 6 => "D")
    final_moves = String[]
    # 2つずつのペア [生成元インデックス, 指数] で処理
    for i in 1:2:length(ext_rep_data)
        idx = ext_rep_data[i]
        pow = ext_rep_data[i+1]
        face = mapping[idx]
        
        # 指数を 0-3 の回転数に正規化
        n = pow % 4
        if n < 0 n += 4 end
        
        if n == 1       # 90度
            push!(final_moves, face)
        elseif n == 2   # 180度
            push!(final_moves, face, face)
        elseif n == 3   # 270度
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
    # 1. 現在の状態を置換オブジェクトに変換
    gap_list = GAP.evalstr("[" * join(cube.state, ",") * "]")
    g = (@gap PermList)(gap_list)

    # 2. 単位元から現在の状態 g を作るための「単語」を計算
    word = (@gap PreImagesRepresentative)(cube.hom, g)
    
    # 3. 文字列パースではなく、GAP内部の整数配列形式(ExtRep)を取得
    # これによりカッコ () やべき乗 ^ のパースエラーを完全に回避
    ext_rep = GAP.Globals.ExtRepOfObj(word)
    ext_rep_jl = Int[x for x in ext_rep]
    
    # 4. 手順のリストに変換
    moves = ext_rep_to_moves(ext_rep_jl)
    
    # 5. 既存の最適化ロジックを通す
    optimized = optimize_moves(moves)
    
    # 6. バックエンドとの互換性のため、スペース区切りの文字列で返す
    return join(optimized, " ")
end