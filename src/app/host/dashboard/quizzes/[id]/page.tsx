import QuizEditor from '../quiz-editor'

export default function EditQuizPage({ params }: { params: { id: string } }) {
  return <QuizEditor quizSetId={params.id} />
}
