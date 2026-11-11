-- Include participants who never answered (previously dropped by inner joins).
create or replace view game_results as
    select
        participants.id as participant_id,
        participants.nickname,
        coalesce(sum(answers.score), 0) total_score,
        participants.game_id as game_id
    from participants
    left join answers on answers.participant_id = participants.id
    group by participants.id;
