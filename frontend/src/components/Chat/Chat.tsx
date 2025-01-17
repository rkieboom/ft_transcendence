import axios from 'axios';
import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../../context/socket';
import './style.css';

import { CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import { showSnackbarNotification } from '../../App';
import Channels from './Channel/Channels';
import Messages, { Message } from './Messages/Messages';
import Players from './Players/Players';
import { hostname } from '../../context/host';

interface User {
	id: number;
	username: string;
}

interface Chat {
	id: number;
	type: string;
	name: string;
	users: User[];

	adminIDs: number[];
	bannedIDs: number[];
	muted: number[];
}
type Friendship = {
	user: User;
	status: string;
	sender: User;
}

const Chat: React.FC = () => {
	
	const socket = useContext(SocketContext);
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();

	const [user, setUser] = useState<User | null>(null);
	const [currentChat, setCurrentChat] = useState<Chat | null>(null);

	document.body.style.background = '#323232';

	useEffect(() => {
		axios.get('http://' + hostname + ':3000/user', { withCredentials: true })
		.then(res => {
			setUser(res.data);
		})
		.catch(err => {
			if (err.response.data.statusCode === 401)
				navigate('/login');
			showSnackbarNotification(enqueueSnackbar, err.response.data.message, 'error');
		});
	}, []); /* Renders only once */

	useEffect(() => {
		if (socket) { /* Socket stuff */
			socket.on('chat/refresh-message', (payload: Message) => {
				/* Enable notification for that channel */
				if (payload.parent.type == 'PRIVATE')
					showSnackbarNotification(enqueueSnackbar, "New message from " + payload.sender.username, 'info');
				else
					showSnackbarNotification(enqueueSnackbar, "New message in groupchat \'" + payload.parent.name + "\'", 'info');
			});
		}
		return () => {
			socket.off('chat/refresh-message');
		}
	}, [socket]);





	const [friendships, setFriendships] = useState<Friendship[]>([]);
	const [mutes, setMutes] = useState<number[]>([]);
	const [admins, setAdmins] = useState<number[]>([]);

	useEffect(() => {
		if (!user || !currentChat) {
			return;
		}

		axios.get('http://' + hostname + ':3000/social', { withCredentials: true })
		.then(res => {
			// parse data
			const parsedData: Friendship[] = res.data.map((friendship: any) => {
				const otherUser = friendship.sender.id == user.id ? friendship.reciever : friendship.sender;
				return {
					status: friendship.status,
					user: otherUser,
					sender: friendship.sender,
				}
			});
			setFriendships(parsedData);
		})
		axios.get('http://' + hostname + ':3000/chat/' + user.id + '/mutes/' + currentChat.id, { withCredentials: true })
		.then(res => {
			setMutes(res.data);
		})
		.catch(err => {
			if (err.response.data.statusCode === 401)
				navigate('/login');
			showSnackbarNotification(enqueueSnackbar, err.response.data.message, 'error');
		});
		axios.get('http://' + hostname + ':3000/chat/' + user.id + '/admins/' + currentChat.id, { withCredentials: true })
		.then(res => {
			setAdmins(res.data);
		})
		.catch(err => {
			if (err.response.data.statusCode === 401)
				navigate('/login');
			showSnackbarNotification(enqueueSnackbar, err.response.data.message, 'error');
		});
		
		if (!socket)
			return;

		socket.on('chat/refresh-friendships', () => {
			axios.get('http://' + hostname + ':3000/social', { withCredentials: true })
			.then(res => {
				// parse data
				const parsedData: Friendship[] = res.data.map((friendship: any) => {
					const otherUser = friendship.sender.id == user.id ? friendship.reciever : friendship.sender;
					return {
						status: friendship.status,
						user: otherUser,
						sender: friendship.sender,
					}
				});
				setFriendships(parsedData);
			})
			.catch(err => {
				if (err.response.data.statusCode === 401)
					navigate('/login');
				showSnackbarNotification(enqueueSnackbar, err.response.data.message, 'error');
			});
		});
		socket.on('chat/refresh-mutes', () => {
			if (!currentChat) {
				return;
			}
			axios.get('http://' + hostname + ':3000/chat/' + user.id + '/mutes/' + currentChat.id, { withCredentials: true })
			.then(res => {
				setMutes(res.data);
			})
			.catch(err => {
				if (err.response.data.statusCode === 401)
					navigate('/login');
				showSnackbarNotification(enqueueSnackbar, err.response.data.message, 'error');
			});
		});
		socket.on('chat/refresh-admins', () => {
			if (!currentChat) {
				return;
			}
			axios.get('http://' + hostname + ':3000/chat/' + user.id + '/admins/' + currentChat.id, { withCredentials: true })
			.then(res => {
				setAdmins(res.data);
			})
			.catch(err => {
				if (err.response.data.statusCode === 401)
					navigate('/login');
				showSnackbarNotification(enqueueSnackbar, err.response.data.message, 'error');
			});
		});
		return () => {
			socket.off('chat/refresh-friendships');
			socket.off('chat/refresh-mutes');
			socket.off('chat/refresh-admins');
		}
	}, [currentChat, socket]);

	if (!user) {
		<CircularProgress />
	}

	return (
		<div className="main-container">
			<Channels
				user={user}
				currentChat={currentChat}
				setCurrentChat={setCurrentChat}
				admins={admins}
				/>
			<Messages
				currentUser={user}
				currentChat={currentChat}
				mutes={mutes}
				friendships={friendships}
				admins={admins}
				/>
			<Players
				currentUser={user}
				currentChat={currentChat}
				mutes={mutes}
				friendships={friendships}
				admins={admins}
				/>
		</div>
	);
}
export default Chat;





